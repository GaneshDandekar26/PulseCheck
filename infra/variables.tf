variable "aws_region" {
  default = "ap-south-1"
}

variable "instance_type" {
  default = "t3.micro"
}

variable "key_pair_name" {
  description = "Name of your EC2 key pair"
  type        = string
  default     = "pulsecheck-key"
}

variable "my_ip" {
  description = "Your public IP for SSH and monitoring access"
  type        = string
  default     = "49.36.10.8/32"   
}